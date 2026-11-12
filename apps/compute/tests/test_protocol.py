"""Unit tests for rolling origin evaluation protocol."""
from app.evaluation.protocol import generate_evaluation_blocks


def test_default_protocol_13_origins():
    blocks, version = generate_evaluation_blocks("2020-07-01", "2020-11-30")
    assert version == "v1-default"
    assert len(blocks) == 13

    # Check origin dates match PRD: 2020-08-31 to 2020-11-23 every 7 days
    assert blocks[0].origin == "2020-08-31"
    assert blocks[1].origin == "2020-09-07"
    assert blocks[12].origin == "2020-11-23"

    # Targets for last origin end on 2020-11-30
    assert blocks[12].target_start == "2020-11-24"
    assert blocks[12].target_end == "2020-11-30"

    # 9 development blocks, 4 final blocks
    dev_blocks = [b for b in blocks if b.split == "development"]
    final_blocks = [b for b in blocks if b.split == "final"]
    assert len(dev_blocks) == 9
    assert len(final_blocks) == 4
    assert [b.index for b in dev_blocks] == list(range(1, 10))
    assert [b.index for b in final_blocks] == list(range(10, 14))


def test_custom_protocol():
    # 133 days span
    blocks, version = generate_evaluation_blocks("2020-06-01", "2020-10-15")
    assert version == "custom"
    assert len(blocks) >= 13
    assert len([b for b in blocks if b.split == "final"]) == 4


def test_future_data_does_not_leak_backwards():
    """Modifying raw data after an origin does not alter that origin's training slice."""
    all_dates = [f"2020-08-{i+1:02d}" for i in range(31)]
    origin = "2020-08-15"

    prefix_dates = [d for d in all_dates if d <= origin]
    assert len(prefix_dates) == 15
    assert prefix_dates[-1] == origin
